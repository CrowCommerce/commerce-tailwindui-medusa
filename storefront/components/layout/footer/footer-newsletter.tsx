export function FooterNewsletter() {
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
          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-primary-600 sm:text-sm/6"
        />
        <div className="ml-4 shrink-0">
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 flex w-full items-center justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
