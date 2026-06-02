import { createFileRoute } from "@tanstack/react-router";



import { AgendarVisitaForm } from "@/components/admin/AgendarVisitaForm";



export const Route = createFileRoute("/painel/agendar")({
  head: () => ({
    links: [{ rel: "stylesheet", href: "/admin/agendar-page.css" }],
  }),
  component: AgendarPage,
});



function AgendarPage() {

  return (

    <div className="analytics-page dashboard-page--visitas">

      <AgendarVisitaForm />

    </div>

  );

}

