const About = () => {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <section className="surface-card space-y-4 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-pb-driftwood">
          About the event
        </p>
        <h1 className="text-3xl font-semibold text-pb-ocean">
          Why BBQ On Ingraham exists
        </h1>
        <p className="text-base leading-7 text-pb-ink">
          This site is a lightweight planning hub for the building's weekly
          Monday barbecue. The goal is simple: see who is coming, avoid duplicate
          food, and keep the whole thing easy enough to use on your phone while
          you are heading downstairs.
        </p>
        <p className="text-base leading-7 text-pb-ink">
          Anyone can RSVP in seconds without creating an account. Admins get a
          planning dashboard to check headcount, monitor food coverage, and set
          the theme for the night.
        </p>
      </section>

      <section className="surface-card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-pb-ocean">Mobile first</h2>
          <p className="mt-2 text-sm leading-6 text-pb-ink">
            The whole interface is designed to load quickly and work well on
            small screens, since most people will open it from their phone.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-pb-ocean">Friendly defaults</h2>
          <p className="mt-2 text-sm leading-6 text-pb-ink">
            The next Monday is always preselected and the RSVP list is visible
            the moment you arrive.
          </p>
        </div>
      </section>
    </main>
  );
};

export default About;
