import { createFileRoute } from "@tanstack/react-router";
import { GharPayHouseView } from "@/components/house/GharPayHouseView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GharPay · More Than a Room, A Place to Belong ❤️" },
      {
        name: "description",
        content:
          "GharPay Animated House Command Center — Interactive multi-floor CRM experience for PG and rental property operations.",
      },
      { property: "og:title", content: "GharPay · More Than a Room, A Place to Belong" },
      {
        property: "og:description",
        content:
          "Animated house-themed UI with M-POWER Call, Booking Flow, and Closing Desk modules.",
      },
    ],
  }),
  component: GharPayHouseView,
});
