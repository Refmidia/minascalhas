import { createFileRoute } from "@tanstack/react-router";



import { AgendarVisitaForm } from "@/components/admin/AgendarVisitaForm";



export const Route = createFileRoute("/painel/agendar")({

  component: AgendarPage,

});



function AgendarPage() {

  return (

    <div className="analytics-page dashboard-page--visitas">

      <AgendarVisitaForm />

    </div>

  );

}

