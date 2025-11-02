import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import CityDetail from '@/pages/CityDetail.vue'

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
    }
  ]
})

export default router
