import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Photobooths for Every Event
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create memorable photo experiences with AI backgrounds, instant delivery, and seamless guest interactions.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/login"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-purple-700"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-xl font-semibold mb-2">Easy Photo Capture</h3>
              <p className="text-gray-600">
                Self-service or photographer mode. Works on any device with a camera.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">AI Backgrounds</h3>
              <p className="text-gray-600">
                Generate custom backgrounds with AI or choose from our curated collection.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">✂️</div>
              <h3 className="text-xl font-semibold mb-2">Background Removal</h3>
              <p className="text-gray-600">
                Automatic background removal for professional-looking composites.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-semibold mb-2">Instant Delivery</h3>
              <p className="text-gray-600">
                Photos delivered directly to guest emails within seconds.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Event Dashboard</h3>
              <p className="text-gray-600">
                Manage events, view photos, and track engagement in real-time.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">QR Code Access</h3>
              <p className="text-gray-600">
                Guests scan a QR code to access the booth - no app required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Create your first event for free. No credit card required.
          </p>
          <Link
            href="/auth/login"
            className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-purple-700"
          >
            Create Free Event
          </Link>
        </div>
      </section>
    </div>
  );
}
