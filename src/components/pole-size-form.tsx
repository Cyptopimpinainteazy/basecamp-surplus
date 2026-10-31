/** GET form for pole measurements. Shared by the public size search and the admin matcher. */
export function PoleSizeForm({
  action,
  values,
  showColor,
  submitLabel,
  dark,
}: {
  action: string;
  values: { length?: string; unit?: string; sections?: string; diameter?: string; color?: string; shape?: string; arms?: string };
  showColor?: boolean;
  submitLabel: string;
  dark?: boolean;
}) {
  const label = `mb-1 block text-sm font-semibold ${dark ? "text-glacier/85" : "text-granite"}`;
  return (
    <form action={action} method="get" className="grid gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.8fr_auto]">
      <div>
        <label htmlFor="shape" className={label}>Type</label>
        <select id="shape" name="shape" defaultValue={values.shape ?? "straight"} className="field h-12 text-ink">
          <option value="straight">Straight pole</option>
          <option value="prebent">Pre-bent pole</option>
          <option value="hub">Hub assembly</option>
        </select>
      </div>
      <div>
        <label htmlFor="length" className={label}>Length (hub: longest leg)</label>
        <div className="flex gap-2">
          <input id="length" name="length" type="number" step="0.1" min="5" max="600" required defaultValue={values.length} className="field h-12 text-ink" placeholder="141" />
          <select name="unit" defaultValue={values.unit ?? "in"} aria-label="Unit" className="field h-12 w-20 text-ink">
            <option value="in">in</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="sections" className={label}>Sections</label>
        <input id="sections" name="sections" type="number" min="1" max="20" defaultValue={values.sections} className="field h-12 text-ink" placeholder="9" />
      </div>
      <div>
        <label htmlFor="arms" className={label}>Hub legs</label>
        <input id="arms" name="arms" type="number" min="2" max="8" defaultValue={values.arms} className="field h-12 text-ink" placeholder="–" />
      </div>
      <div>
        <label htmlFor="diameter" className={label}>Diameter (mm)</label>
        <input id="diameter" name="diameter" type="number" step="0.05" min="3" max="25" defaultValue={values.diameter} className="field h-12 text-ink" placeholder="9.5" />
      </div>
      {showColor && (
        <div>
          <label htmlFor="color" className={label}>Color</label>
          <input id="color" name="color" defaultValue={values.color} className="field h-12 text-ink" placeholder="gray" />
        </div>
      )}
      <button className="btn btn-blaze h-12">{submitLabel}</button>
    </form>
  );
}
