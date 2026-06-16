import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';
import { Role } from '../../../core/models/role.enum';

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../pages/dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('../pages/usuarios/admin-usuarios.component').then(
        (m) => m.AdminUsuariosComponent,
      ),
  },
  {
    path: 'grupos',
    loadComponent: () =>
      import('../../profesor/pages/grupos/grupos-list/grupos-list.component').then(
        (m) => m.GruposListComponent,
      ),
  },
  {
    path: 'grupos/nuevo',
    canActivate: [roleGuard(Role.ADMIN)],
    loadComponent: () =>
      import('../../profesor/pages/grupos/grupo-form/grupo-form.component').then(
        (m) => m.GrupoFormComponent,
      ),
  },
  {
    path: 'grupos/:id/editar',
    canActivate: [roleGuard(Role.ADMIN)],
    loadComponent: () =>
      import('../../profesor/pages/grupos/grupo-form/grupo-form.component').then(
        (m) => m.GrupoFormComponent,
      ),
  },
  {
    path: 'grupos/:id',
    loadComponent: () =>
      import('../../profesor/pages/grupos/grupo-detail/grupo-detail.component').then(
        (m) => m.GrupoDetailComponent,
      ),
  },
  {
    path: 'casos',
    loadComponent: () =>
      import('../../profesor/pages/casos/docente-casos-list/docente-casos-list.component').then(
        (m) => m.DocenteCasosListComponent,
      ),
  },
  {
    path: 'casos/nuevo',
    canActivate: [roleGuard(Role.ADMIN)],
    loadComponent: () =>
      import('../../profesor/pages/casos/docente-caso-form/docente-caso-form.component').then(
        (m) => m.DocenteCasoFormComponent,
      ),
  },
  {
    path: 'casos/generar',
    canActivate: [roleGuard(Role.ADMIN)],
    loadComponent: () =>
      import('../../profesor/pages/casos/docente-caso-ia-form/docente-caso-ia-form.component').then(
        (m) => m.DocenteCasoIaFormComponent,
      ),
  },
  {
    path: 'casos/:casoId/editar',
    canActivate: [roleGuard(Role.ADMIN)],
    loadComponent: () =>
      import('../../profesor/pages/casos/docente-caso-form/docente-caso-form.component').then(
        (m) => m.DocenteCasoFormComponent,
      ),
  },
  {
    path: 'casos/:casoId',
    loadComponent: () =>
      import('../../profesor/pages/casos/docente-caso-detail/docente-caso-detail.component').then(
        (m) => m.DocenteCasoDetailComponent,
      ),
  },
];
