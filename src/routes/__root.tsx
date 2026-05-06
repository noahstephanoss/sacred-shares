import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useStreak } from "@/hooks/useStreak";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Testimonies" },
      { name: "description", content: "Share your testimony, seek righteous counsel, and grow in faith with a community rooted in truth." },
      { name: "author", content: "Testimonies" },
      { property: "og:title", content: "Testimonies" },
      { property: "og:description", content: "Share your testimony, seek righteous counsel, and grow in faith with a community rooted in truth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Testimonies" },
      { name: "twitter:description", content: "Share your testimony, seek righteous counsel, and grow in faith with a community rooted in truth." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3394a1df-65d3-4845-8656-2add5155d598/id-preview-ca2d4348--b2381dad-9f27-4886-994f-f6021b80319e.lovable.app-1777948387662.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3394a1df-65d3-4845-8656-2add5155d598/id-preview-ca2d4348--b2381dad-9f27-4886-994f-f6021b80319e.lovable.app-1777948387662.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <noscript>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "100vh", fontFamily: "Georgia, serif",
            background: "#FAF3E0", color: "#2C1810", padding: "2rem", textAlign: "center" as const,
          }}>
            <div>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#B8860B" }}>✝</div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>JavaScript Required</h1>
              <p style={{ marginTop: "0.5rem", color: "#6B4C3B" }}>Please enable JavaScript to use Testimonies.</p>
            </div>
          </div>
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t=setTimeout(function(){
                  if(document.getElementById('__testimonies_fallback'))return;
                  var d=document.createElement('div');
                  d.id='__testimonies_fallback';
                  d.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;background:#FAF3E0;color:#2C1810;padding:2rem;text-align:center';
                  d.innerHTML='<div>'
                    +'<div style="font-size:2.5rem;margin-bottom:0.75rem;color:#B8860B">✝</div>'
                    +'<h1 style="font-size:1.5rem;font-weight:bold;margin:0">Having trouble connecting</h1>'
                    +'<p style="margin-top:0.5rem;color:#6B4C3B;font-size:0.95rem;max-width:360px">The page took longer than expected to load. This is usually a temporary connection issue — not something you did wrong.</p>'
                    +'<button onclick="location.reload()" style="margin-top:1.5rem;padding:0.625rem 1.75rem;background:#6B3F2A;color:#FAF3E0;border:none;border-radius:6px;font-size:0.9rem;font-family:Georgia,serif;cursor:pointer">Refresh &amp; Retry</button>'
                    +'<p style="margin-top:1rem;color:#6B4C3B;font-size:0.8rem">If this keeps happening, try again in a moment.</p>'
                  +'</div>';
                  document.body.appendChild(d);
                },6000);
                window.addEventListener('DOMContentLoaded',function(){
                  var root=document.getElementById('root')||document.querySelector('[data-reactroot]');
                  if(root&&root.children.length>0)clearTimeout(t);
                });
                var obs=new MutationObserver(function(){
                  var fb=document.getElementById('__testimonies_fallback');
                  var hasApp=document.querySelector('.min-h-screen');
                  if(hasApp&&fb){fb.remove();obs.disconnect();}
                });
                obs.observe(document.body,{childList:true,subtree:true});
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

function RootComponent() {
  useStreak();
  return <Outlet />;
}
