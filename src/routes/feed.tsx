import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/feed")({ loader: () => { throw redirect({to:"/home",statusCode:301}); } });
