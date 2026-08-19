/**
 * Site-wide Sasify backdrop.
 * Bright white base with blue/violet brand sweeps and a light promo-print texture.
 */
export default function AmbientBackground() {
  return (
    <div aria-hidden className="site-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_42%,#eef3ff_100%)]" />
      <div className="absolute top-0 hidden h-[48rem] w-[48rem] rounded-bl-[16rem] bg-[linear-gradient(135deg,#075dff_0%,#6242ff_45%,#8e35ff_100%)] lg:-right-[18vw] lg:block lg:opacity-95" />
      <div className="absolute right-8 top-8 hidden h-52 w-52 opacity-35 [background-image:radial-gradient(#ffffff_2px,transparent_2px)] [background-size:18px_18px] lg:block" />
      <div className="absolute left-0 top-[18rem] h-px w-full bg-gradient-to-r from-transparent via-[#0f4cff]/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-[linear-gradient(0deg,rgba(6,22,82,0.08),transparent)]" />
    </div>
  );
}
