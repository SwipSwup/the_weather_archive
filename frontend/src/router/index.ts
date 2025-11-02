import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import CityDetail from '@/pages/CityDetail.vue'
import NotFound from '@/pages/NotFound.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/city/:cityName',
      name: 'CityDetail',
      component: CityDetail,
      props: true
    },
    {
      path: '/404',
      name: 'NotFound',
      component: NotFound
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404'
    }
  ]
})

export default router

