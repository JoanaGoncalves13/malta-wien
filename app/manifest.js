export default function manifest() {
  return {
    name: "play smart",
    short_name: "play smart",
    description: "Split bills, track spending and see what's on in Vienna",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf3f2",
    theme_color: "#d81e2c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
