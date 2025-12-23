import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "per event",
    description: "Perfect for trying out BoothOS",
    features: [
      "25 photos",
      "Self-service mode",
      "Email delivery",
      "Curated backgrounds",
      "Watermarked photos",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$30",
    period: "per event",
    description: "Great for personal events",
    features: [
      "300 photos",
      "Self-service mode",
      "Background removal",
      "5 AI backgrounds",
      "Curated backgrounds",
      "No watermark",
    ],
    cta: "Get Pro",
    highlight: true,
  },
  {
    name: "Corporate",
    price: "$100",
    period: "per event",
    description: "For professional events",
    features: [
      "1,000 photos",
      "Self-service OR Photographer mode",
      "Background removal",
      "10 AI backgrounds",
      "Curated backgrounds",
      "No watermark",
      "Priority support",
    ],
    cta: "Get Corporate",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Event-Based Pricing</h1>
          <p className="text-xl text-gray-600">Pay per event. No subscriptions, no hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlight
                  ? "bg-purple-600 text-white ring-4 ring-purple-600 ring-offset-2"
                  : "bg-white border border-gray-200"
              }`}
            >
              <h3 className={`text-xl font-semibold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                  {plan.price}
                </span>
                <span className={`ml-2 ${plan.highlight ? "text-purple-200" : "text-gray-500"}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`mt-2 ${plan.highlight ? "text-purple-200" : "text-gray-500"}`}>
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className={`w-5 h-5 mr-3 ${plan.highlight ? "text-purple-200" : "text-purple-600"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className={plan.highlight ? "text-white" : "text-gray-600"}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/login"
                className={`mt-8 block w-full py-3 px-4 rounded-lg text-center font-medium ${
                  plan.highlight
                    ? "bg-white text-purple-600 hover:bg-gray-100"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need More?</h2>
          <p className="text-gray-600 mb-4">
            Contact us for custom enterprise solutions with unlimited photos, white-labeling, and dedicated support.
          </p>
          <a
            href="mailto:hello@boothos.app"
            className="text-purple-600 font-medium hover:text-purple-700"
          >
            Contact Sales →
          </a>
        </div>
      </div>
    </div>
  );
}
