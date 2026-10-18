import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initAnalytics } from './analytics';
import './style.css';

initAnalytics();
createApp(App).use(router).mount('#app');
