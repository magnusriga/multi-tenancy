import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  console.log("hostname: ", hostname);
  // special case for Vercel preview deployment URLs
  if (
    hostname.includes("---") &&
    hostname.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    hostname = `${hostname.split("---")[0]}.${
      process.env.NEXT_PUBLIC_ROOT_DOMAIN
    }`;
  }

  const searchParams = req.nextUrl.searchParams.toString();
  console.log("searchParams:", searchParams);

  // Get the pathname of the request (e.g. /, /about, /blog/first-post)
  const path = `${url.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;
  console.log("path: ", path);

  // If host url is app.root, redirect to /app/path.
  if (hostname == `app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    // const session = await getToken({ req });
    const session = true;
    if (!session && path !== "/login") {
      // If not logged in, and not going to login page, redirect to login.
      return NextResponse.redirect(new URL("/login", req.url));
    } else if (session && path == "/login") {
      // If already logged in, and going to login page, redirect to home page.
      console.log(`hostname was app.root, and path was /login, redirecting to ${new URL("/", req.url)}`)
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Otherwise, if logged in and not targeting login page, or not logged in and going
    // anywhere but login, redirect to /app/path
    console.log(`hostname was app.root, and path was not /login, rewriting request to ${new URL(`/app${path === "/" ? "" : path}`, req.url)}`)
    return NextResponse.rewrite(
      new URL(`/app${path === "/" ? "" : path}`, req.url),
    );
  }

  // special case for `vercel.pub` domain
  if (hostname === "vercel.pub") {
    return NextResponse.redirect(
      "https://vercel.com/blog/platforms-starter-kit",
    );
  }

  // rewrite root application to `/home` folder
  // If hostname is root, redirect to /home/path
  if (
    hostname === "localhost:3000" ||
    hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN
  ) {
    console.log(`Rewriting to /home${path}`)
    return NextResponse.rewrite(
      new URL(`/home${path === "/" ? "" : path}`, req.url),
    );
  }

  // rewrite everything else to `/[domain]/[slug] dynamic route
  // If targeting custom host, rewrite to /host/path, with [domain] parameter as hostname.
  return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
}
