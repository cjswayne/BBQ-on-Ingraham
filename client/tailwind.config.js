/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pb: {
          // --- Brand palette (edit these to retheme the entire app) ---
          ocean: "#5A5F63",     // roof gray — dominant UI chrome
          seafoam: "#8B8F7A",   // stucco green-gray — secondary accents
          sand: "#D6C7A1",      // trim/door beige — page background
          coral: "#D1492E",     // ember red-orange — primary CTA buttons
          lavender: "#C4C4C4",  // smoke gray — subtle highlights
          palm: "#5E7F57",      // foliage green — secondary action buttons
          driftwood: "#7A4E2D", // wood/smoked brown — muted label text
          neon: "#8C2F1C",      // BBQ sauce red — strong accent

          // --- Semantic / utility tokens ---
          ink: "#504940",       // body and content text
          error: "#B64033",     // error messages and destructive actions
          cream: "#F4F1E8",     // hover background on light surfaces
          mist: "#F7FBFD",      // near-white hover tint
          grape: "#5F4C83"      // guest badge text (purple)
        }
      }
    }
  },
  plugins: []
};
