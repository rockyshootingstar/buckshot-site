// Fills in prices, free-plan limits and founder spots from Buckshot's server, the one place the app reads them too.
// If the server can't be reached, the numbers already in the page stay.
(function () {
  const API = "https://api.buckshotapp.com/v1/config";
  const money = n => "$" + Number(n).toFixed(2);

  window.buckshotConfig = fetch(API).then(r => r.ok ? r.json() : null).catch(() => null);

  window.buckshotConfig.then(config => {
    if (!config) return;
    document.querySelectorAll("[data-free]").forEach(el => {
      const value = config.free[el.dataset.free];
      if (value != null) el.textContent = value;
    });
    const f = config.founder;
    document.querySelectorAll("[data-plan]").forEach(card => {
      const plan = config.plans[card.dataset.plan];
      if (!plan) return;
      const founderOpen = card.dataset.plan === "lifetime" ? f.lifetimeOpen : f.subscriptionsOpen;
      const amount = card.querySelector(".amount"), was = card.querySelector(".was");
      if (amount) amount.textContent = money(founderOpen ? plan.founderPrice : plan.price);
      if (was) {
        if (founderOpen) {
          const left = card.dataset.plan === "lifetime" ? f.lifetimeSpotsLeft : f.subscriberSpotsLeft;
          was.innerHTML = `<s>${money(plan.price)}</s><strong>Founder price</strong>` + (f.started ? ` · ${left} left` : "");
        } else {
          was.textContent = "";
        }
      }
    });
    const note = document.getElementById("founder");
    if (note && f.open && (f.subscriptionsOpen || f.lifetimeOpen)) {
      note.hidden = false;
      note.innerHTML = f.started
        ? `<strong>Founder offer:</strong> the first ${f.subscriberSpots} subscribers keep their founder price for as long as they stay subscribed, plus ${f.lifetimeSpots} founder lifetimes. ${f.subscriberSpotsLeft} subscriber and ${f.lifetimeSpotsLeft} lifetime spots left` + (f.endsAt ? `, until ${new Date(f.endsAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.` : ".")
        : `<strong>Founder offer at launch:</strong> the first ${f.subscriberSpots} subscribers keep their founder price for as long as they stay subscribed, plus ${f.lifetimeSpots} founder lifetimes. ${f.days} days only.`;
    }
  });

  // The Free card's Download opens the same beta notice as the top Download button.
  document.querySelectorAll("[data-download]").forEach(a => a.addEventListener("click", e => {
    const main = document.getElementById("download");
    if (main) { e.preventDefault(); main.click(); }
  }));
})();
