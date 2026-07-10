import { createRouter, createWebHistory } from 'vue-router';
import Landing from './pages/Landing.vue';
import About from './pages/About.vue';
import Workbench from './pages/Workbench.vue';
import { applyPageSeo } from './seo';
import { LANDING_FAQ } from './faq';

const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
};

const routes = [
    {
        path: '/',
        name: 'landing',
        component: Landing,
        meta: {
            title: 'Free JCL Check Online — Validate Job Control Language Without a Mainframe',
            description: 'JCLcheck is a free online JCL checker and validator. Catch statement-order, DD, keyword and PROC errors in your Job Control Language instantly, with plain-English fixes — no mainframe required.',
            structuredData: faqStructuredData
        }
    },
    {
        path: '/about',
        name: 'about',
        component: About,
        meta: {
            title: 'About',
            description: "Why JCLcheck exists, and who built it — a free online JCL validation workbench for learning mainframe Job Control Language."
        }
    },
    {
        path: '/app',
        name: 'workbench',
        component: Workbench,
        meta: {
            title: 'JCL Check Online — Validation Workbench',
            description: 'Paste your JCL and check it online instantly: statement ordering, DD rules, keyword validation, DISP/SPACE/DCB syntax, and PROC symbolics — with plain-English errors and fixes.'
        }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});

router.afterEach((to) => {
    applyPageSeo({
        title: to.meta.title,
        description: to.meta.description,
        path: to.path,
        structuredData: to.meta.structuredData
    });
});

export default router;
