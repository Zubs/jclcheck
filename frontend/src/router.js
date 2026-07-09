import { createRouter, createWebHistory } from 'vue-router';
import Landing from './pages/Landing.vue';
import About from './pages/About.vue';
import Workbench from './pages/Workbench.vue';

const routes = [
  { path: '/', name: 'landing', component: Landing },
  { path: '/about', name: 'about', component: About },
  { path: '/app', name: 'workbench', component: Workbench }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
