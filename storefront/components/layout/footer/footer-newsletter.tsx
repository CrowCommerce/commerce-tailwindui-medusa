export default function FooterNewsletter() {
  return (
    <div className="mt-12 md:col-span-8 md:col-start-3 md:row-start-2 md:mt-0 lg:col-span-4 lg:col-start-9 lg:row-start-1">
      <h3 className="text-sm font-medium text-gray-900">
        Sign up for our newsletter
      </h3>
      <p className="mt-6 text-sm text-gray-500">
        The latest deals and savings, sent to your inbox weekly.
      </p>
      <form className="mt-2 flex sm:max-w-md">
        <input
          id="email-address"
          type="text"
          required
          autoComplete="email"
          aria-label="Email address"
          className="block w-full rounded-md bg-white px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 border border-gray-300 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
        <div className="ml-4 shrink-0">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-hidden"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
