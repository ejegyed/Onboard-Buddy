import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout';
import { SupervisorProvider } from '@/context/supervisor-context';

import Dashboard from '@/pages/dashboard';
import CohortsList from '@/pages/cohorts';
import CohortDetail from '@/pages/cohorts/detail';
import AssociatesList from '@/pages/associates';
import AssociateDetail from '@/pages/associates/detail';
import SupervisorsList from '@/pages/supervisors';
import SupervisorDetail from '@/pages/supervisors/detail';
import CheckinsList from '@/pages/checkins';
import HeatmapPage from '@/pages/heatmap';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cohorts" component={CohortsList} />
        <Route path="/cohorts/:id" component={CohortDetail} />
        <Route path="/associates" component={AssociatesList} />
        <Route path="/associates/:id" component={AssociateDetail} />
        <Route path="/supervisors" component={SupervisorsList} />
        <Route path="/supervisors/:id" component={SupervisorDetail} />
        <Route path="/checkins" component={CheckinsList} />
        <Route path="/heatmap" component={HeatmapPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupervisorProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </SupervisorProvider>
    </QueryClientProvider>
  );
}

export default App;
