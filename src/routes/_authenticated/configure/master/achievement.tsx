import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/configure/master/achievement',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/configure/master/achievement"!</div>
}
