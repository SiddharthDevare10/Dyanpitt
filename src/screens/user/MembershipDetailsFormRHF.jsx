/* eslint-disable */
// Experimental RHF + zod form (scaffold)
// Not wired yet; safe to keep in repo without affecting current behavior
// Will activate only when imported from MembershipDetailsScreen under a feature flag

import React from 'react';

const RHF_FLAG = (import.meta.env.VITE_RHF_ENABLED_MEMBERSHIP || 'false').toLowerCase() === 'true';

export default function MembershipDetailsFormRHF(props) {
  // If flag is off, render nothing so caller can fall back to legacy form
  if (!RHF_FLAG) return null;

  // Try to dynamically import libraries. If unavailable, render nothing.
  // The caller should detect null and render the legacy form.
  // We do not throw here to avoid breaking the app.
  return (
    <AsyncRHF {...props} />
  );
}

function AsyncRHF(props) {
  const [mods, setMods] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pkgRHF = '@hookform/resolvers/zod';
        const pkgForm = 'react-hook-form';
        const pkgZod = 'zod';
        const [{ zodResolver }, RHF, Z] = await Promise.all([
          import(/* @vite-ignore */ pkgRHF),
          import(/* @vite-ignore */ pkgForm),
          import(/* @vite-ignore */ pkgZod),
        ]);
        if (!cancelled) setMods({ zodResolver, RHF, Z });
      } catch (e) {
        // Missing packages: stay silent and let legacy form render
        if (!cancelled) setMods(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!mods) return null;

  // Example minimal wiring to show viability; not a full migration yet
  const { RHF, Z, zodResolver } = mods;
  const schema = Z.z.object({
    visitedBefore: Z.z.enum(['yes', 'no']),
  });
  const { register, handleSubmit, formState: { errors } } = RHF.useForm({
    resolver: zodResolver(schema),
    defaultValues: props.defaultValues || { visitedBefore: 'no' },
  });

  const onSubmit = (data) => {
    // Placeholder: delegate back to parent if provided
    props.onSubmit?.(data);
  };

  // Render a very small subset, purely for scaffold demonstration
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="input-group">
        <label className="membership-input-label">Have you visited before?</label>
        <div className="radio-group">
          <label className="radio-option">
            <input type="radio" value="yes" {...register('visitedBefore')} />
            <span className="radio-custom"></span>
            Yes
          </label>
          <label className="radio-option">
            <input type="radio" value="no" {...register('visitedBefore')} />
            <span className="radio-custom"></span>
            No
          </label>
        </div>
        {errors.visitedBefore && (
          <span className="error-message">{errors.visitedBefore.message}</span>
        )}
      </div>
      <button type="submit" className="login-button">Continue</button>
    </form>
  );
}
