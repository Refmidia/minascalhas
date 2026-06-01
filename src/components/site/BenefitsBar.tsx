import { BENEFITS } from "@/data/site";

export function BenefitsBar() {
  return (
    <div className="relative -mt-20 lg:-mt-24 z-10 px-6">
      <ul className="mx-auto max-w-6xl bg-white rounded-[22px] shadow-xl border-t-4 border-brand-green p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex flex-col gap-3">
            <span className="h-12 w-12 rounded-full bg-brand-green-soft text-brand-green grid place-items-center" aria-hidden="true">
              <Icon size={22} />
            </span>
            <h3 className="font-semibold text-brand-navy">{title}</h3>
            <p className="text-sm text-brand-muted leading-relaxed">{description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
