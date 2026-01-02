import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import CityOverview from '@/pages/CityOverview.vue'
import CityDateDetail from '@/pages/CityDateDetail.vue'
import CameraSimulation from '@/pages/CameraSimulation.vue'
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
      name: 'CityOverview',
      component: CityOverview,
      props: true
    },
    {
      path: '/city/:cityName/:date',
      name: 'CityDateDetail',
      component: CityDateDetail,
      props: true
    },
    {
      path: '/404',
      name: 'NotFound',
      component: NotFound
    },
    {
      path: '/camera-simulation',
      name: 'CameraSimulation',
      component: CameraSimulation
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404'
    }
  ]
})

export default router

