import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Check, CreditCard, MessageSquare, ShoppingCart, Wallet } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { clearPurchaseOperationKey, getPurchaseOperationKey } from "@/lib/purchase-idempotency";

type ProductPlanView = {
  id: number;
  name: string;
  price: string;
  salePrice?: string | null;
  deliveryTime: string;
  warranty?: string | null;
};

type RelatedProductView = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  categoryName: string;
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { format } = useCurrency();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  const { data: product, isLoading } = trpc.public.productBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  const utils = trpc.useUtils();

  const orderMutation = trpc.order.create.useMutation({
    onSuccess: (data, variables) => {
      if (user?.id) clearPurchaseOperationKey("wallet-order", user.id, [variables.productId, variables.planId], variables.idempotencyKey);
      toast.success(data.message || `Order placed! Order #${data.orderNumber}`);
      utils.dashboard.summary.invalidate();
      utils.wallet.balance.invalidate();
      utils.wallet.transactions.invalidate();
      utils.order.list.invalidate();
      navigate("/dashboard/orders");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <Layout pageKey="product-detail">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-[#dfe6ff]" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout pageKey="product-detail">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-black text-[#050816]">Product not found</h1>
          <Link to="/tools" className="mt-4 inline-block font-black text-[#155cff]">
            Browse all tools
          </Link>
        </div>
      </Layout>
    );
  }

  const plans = product.plans as ProductPlanView[];
  const features = product.features as string[];
  const related = product.related as RelatedProductView[];
  const selectedPlanData = plans.find((p: ProductPlanView) => p.id === selectedPlan);
  const isManualActivation = product.fulfillmentType === "whatsapp_activation";
  const defaultPlan = plans[0];
  const activePlan = selectedPlanData ?? defaultPlan;
  const price = activePlan ? activePlan.salePrice ?? activePlan.price : "0";
  const discountedPrice = (parseFloat(price) * 0.95).toFixed(2);
  const handleOrder = () => {
    if (!isAuthenticated) {
      toast.info("Please login to place an order");
      navigate("/login");
      return;
    }
    const planId = activePlan?.id;
    if (!planId) {
      toast.error("No plan available");
      return;
    }
    if (!user?.id) {
      toast.error("Your session is still loading. Please try again.");
      return;
    }
    orderMutation.mutate({ productId: product.id, planId, idempotencyKey: getPurchaseOperationKey("wallet-order", user.id, [product.id, planId]) });
  };

  return (
    <Layout pageKey="product-detail">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#7c8498]">
            <Link to="/" className="tap-target inline-flex items-center hover:text-[#155cff]">Home</Link>
            <span>/</span>
            <Link to="/tools" className="tap-target inline-flex items-center hover:text-[#155cff]">Tools</Link>
            <span>/</span>
            <Link to={`/categories/${product.categorySlug}`} className="tap-target inline-flex items-center hover:text-[#155cff]">
              {product.categoryName}
            </Link>
            <span>/</span>
            <span className="text-[#050816]">{product.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="tap-target inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#39415d] ring-1 ring-[#dfe6ff] hover:text-[#155cff]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Link
              to="/tools"
              className="tap-target inline-flex items-center rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-black text-[#155cff] ring-1 ring-[#dfe6ff]"
            >
              All Tools
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white p-6 shadow-[0_18px_54px_rgba(12,37,104,0.11)] ring-1 ring-[#dfe6ff] sm:p-8"
          >
            <span className="inline-block rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-black text-[#155cff]">
              {product.categoryName}
            </span>
            <h1 className="safe-wrap mt-4 text-[clamp(2rem,7vw,4.5rem)] font-black leading-[1] text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
              {product.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
              {product.shortDescription}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-[linear-gradient(135deg,#061652,#075dff_52%,#6d35ff)] px-5 py-4 text-white">
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#ffe21f]">Sasify price</span>
                <span className="mt-1 block text-3xl font-black">{format(price)}</span>
              </div>
              <span className="rounded-full bg-[#eafff0] px-4 py-2 text-xs font-black text-[#0b8f34]">
                {isManualActivation ? "Manual activation" : `${activePlan?.deliveryTime || "Instant"} delivery`}
              </span>
              <span className="rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-black text-[#155cff]">
                Ticket support included
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
                Features
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-[#f7f9ff] p-3 ring-1 ring-[#dfe6ff]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#10b83f]" />
                    <span className="text-sm font-semibold text-[#39415d]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
                Description
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[#596176]">{product.description}</p>
            </div>
          </motion.div>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-[0_18px_54px_rgba(12,37,104,0.11)] ring-1 ring-[#dfe6ff]">
              <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
                Select a plan
              </h2>
              <div className="mt-4 grid gap-3">
                {plans.map((plan: ProductPlanView) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      (selectedPlan ?? defaultPlan?.id) === plan.id
                        ? "border-[#155cff] bg-[#eef3ff] shadow-[0_0_0_4px_rgba(21,92,255,0.1)]"
                        : "border-[#dfe6ff] bg-white hover:border-[#155cff]/40"
                    }`}
                  >
                    <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
                      <div>
                        <h3 className="font-black text-[#050816]">{plan.name}</h3>
                        <p className="mt-1 text-xs font-bold text-[#7c8498]">{plan.deliveryTime}</p>
                      </div>
                      <div className="min-[430px]:text-right">
                        <span className="block text-xl font-black text-[#155cff]">{format(plan.salePrice ?? plan.price)}</span>
                        {plan.salePrice && <span className="text-xs font-bold text-[#8992aa] line-through">{format(plan.price)}</span>}
                      </div>
                    </div>
                    {plan.warranty && <p className="mt-2 text-xs font-black text-[#10b83f]">{plan.warranty}</p>}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#155cff]/20 bg-[#eef3ff] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-[#155cff]" />
                    <span className="text-sm font-semibold text-[#155cff]">
                      {isManualActivation
                      ? "After payment, manual activation is tracked inside your dashboard orders and support tickets."
                      : "Purchase through your SASIFY account and use the dashboard wallet for automatic delivery and order tracking."}
                      {!isManualActivation && <> Wallet price: <strong>{format(discountedPrice)}</strong></>}
                    </span>
                  </div>
                </div>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={handleOrder}
                  disabled={orderMutation.isPending}
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-7 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {orderMutation.isPending ? "Processing..." : isAuthenticated ? "Pay with Wallet" : "Sign in to Purchase"}
                </button>
                <div className="rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#155cff]" />
                    <h3 className="text-sm font-black text-[#050816]">Secure account checkout</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#7c8498]">
                    Purchases are handled through your SASIFY account so orders, delivery, and support stay linked to one customer workspace.
                  </p>
                  <div className="mt-3 rounded-xl bg-white p-3 text-xs font-bold text-[#39415d] ring-1 ring-[#dfe6ff]">
                    Pay exact amount: <span className="text-[#155cff]">{format(price)}</span>
                    <span className="mt-1 block text-[#7c8498]">
                      Add funds from your dashboard wallet, then complete checkout to receive delivery and support updates in one place.
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <Link
                      to={isAuthenticated ? "/dashboard/wallet" : "/login"}
                      className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[#061652] px-5 py-3 text-sm font-black text-white"
                    >
                      <Wallet className="h-4 w-4" />
                      {isAuthenticated ? "Open Wallet" : "Sign in to Continue"}
                    </Link>
                    <Link
                      to="/dashboard/support"
                      className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#39415d] ring-1 ring-[#dfe6ff]"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Support is handled by tickets only
                    </Link>
                  </div>
                </div>
                <Link
                  to="/faq"
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[#eef3ff] px-7 py-3 text-sm font-black text-[#155cff] ring-1 ring-[#dfe6ff]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Read FAQs
                </Link>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#7c8498]">
                Account credentials, activation updates, and support follow-up are managed inside your dashboard.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#dfe6ff]">
              <p className="text-xs font-medium leading-relaxed text-[#7c8498]">
                SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers. SASIFY Solutions is not affiliated with, endorsed by, or officially connected to any third-party brand unless explicitly stated.
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
              Related Tools
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rp: RelatedProductView) => (
                <Link
                  key={rp.id}
                  to={`/tools/${rp.slug}`}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#dfe6ff] transition-transform hover:-translate-y-1"
                >
                  <span className="text-xs font-black text-[#155cff]">{rp.categoryName}</span>
                  <h3 className="mt-1 font-black text-[#050816]">{rp.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-[#596176]">{rp.shortDescription}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

