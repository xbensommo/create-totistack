import fs from 'fs-extra';
import path from 'path';

export default async function generateLanding() {
  const viewsDir = 'src/views';
  await fs.ensureDir(viewsDir);
  
  const landingContent = `<!--
 * @title LandingPage
 * @description Modern e-commerce landing page
 * @author Inspired by Reverie Fashion
 * @created ${new Date().toISOString()}
-->
<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-20">
          <router-link to="/" class="flex items-center">
            <div class="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white mr-3">
              <span class="i-mdi-diamond-stone text-xl"></span>
            </div>
            <span class="text-xl font-bold text-gray-900 tracking-tight">Elegance</span>
          </router-link>
          
          <nav class="hidden md:flex space-x-8">
            <router-link to="/" class="text-base font-medium text-gray-900 hover:text-primary transition">Home</router-link>
            <router-link to="/shop" class="text-base font-medium text-gray-600 hover:text-gray-900 transition">Shop</router-link>
            <router-link to="/collections" class="text-base font-medium text-gray-600 hover:text-gray-900 transition">Collections</router-link>
            <router-link to="/about" class="text-base font-medium text-gray-600 hover:text-gray-900 transition">About</router-link>
            <router-link to="/contact" class="text-base font-medium text-gray-600 hover:text-gray-900 transition">Contact</router-link>
          </nav>
          
          <div class="flex items-center space-x-4">
            <button class="p-2 text-gray-600 hover:text-gray-900">
              <span class="i-mdi-magnify text-xl"></span>
            </button>
            <button class="p-2 text-gray-600 hover:text-gray-900">
              <span class="i-mdi-heart-outline text-xl"></span>
            </button>
            <button class="p-2 text-gray-600 hover:text-gray-900">
              <span class="i-mdi-cart-outline text-xl"></span>
            </button>
            <router-link to="/login" class="hidden md:inline-block ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition">
              Sign in
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative bg-gradient-to-r from-gray-50 to-gray-100 overflow-hidden">
      <div class="max-w-7xl mx-auto">
        <div class="relative z-10 pb-16 pt-48 px-4 sm:px-6 lg:px-8">
          <div class="max-w-xl">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
              Discover Your <span class="text-primary">Unique Style</span>
            </h1>
            <p class="mt-6 text-xl text-gray-600 max-w-lg">
              Premium fashion collections crafted with passion and attention to detail
            </p>
            <div class="mt-10 flex flex-wrap gap-4">
              <router-link 
                to="/shop" 
                class="px-8 py-3.5 bg-gray-900 hover:bg-primary text-white font-medium rounded-md transition duration-300 flex items-center"
              >
                Shop Collection
                <span class="i-mdi-arrow-right ml-2 text-lg"></span>
              </router-link>
              <router-link 
                to="/about" 
                class="px-8 py-3.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md transition duration-300"
              >
                Learn More
              </router-link>
            </div>
          </div>
        </div>
        <div class="absolute inset-y-0 right-0 w-1/2 lg:w-1/3">
          <div class="h-full w-full bg-gray-200 border-2 border-dashed rounded-xl"></div>
        </div>
      </div>
    </section>

    <!-- Featured Categories -->
    <section class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <p class="text-gray-600">
            Explore our carefully curated collections for every occasion
          </p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="(category, index) in categories" :key="index" class="group relative rounded-xl overflow-hidden">
            <div class="h-80 bg-gray-200 border-2 border-dashed rounded-xl"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent flex items-end p-6">
              <div>
                <h3 class="text-xl font-bold text-white">{{ category.name }}</h3>
                <router-link 
                  :to="category.link" 
                  class="mt-2 inline-flex items-center text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  Shop now
                  <span class="i-mdi-arrow-right ml-1"></span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-16 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center mb-12">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">New Arrivals</h2>
            <p class="text-gray-600 mt-2">Discover our latest additions</p>
          </div>
          <router-link to="/shop" class="text-primary font-medium hover:underline flex items-center">
            View all
            <span class="i-mdi-arrow-right ml-1"></span>
          </router-link>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="(product, index) in products" :key="index" class="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div class="h-64 bg-gray-200 border-2 border-dashed rounded-t-xl"></div>
            <div class="p-5">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
                  <p class="text-gray-600 text-sm mt-1">{{ product.category }}</p>
                </div>
                <span class="i-mdi-heart-outline text-gray-400 hover:text-primary cursor-pointer"></span>
              </div>
              <div class="mt-4 flex justify-between items-center">
                <span class="text-lg font-bold text-gray-900">\${{ product.price }}</span>
                <button class="text-primary hover:text-primary-dark flex items-center">
                  <span class="i-mdi-cart-plus text-xl"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Customer Stories</h2>
          <p class="text-gray-600">
            What our customers say about us
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="(testimonial, index) in testimonials" :key="index" class="bg-gray-50 p-8 rounded-xl">
            <div class="flex items-center mb-6">
              <div class="flex-shrink-0">
                <div class="bg-gray-200 border-2 border-dashed rounded-full w-12 h-12"></div>
              </div>
              <div class="ml-4">
                <h4 class="font-bold text-gray-900">{{ testimonial.name }}</h4>
                <div class="flex text-yellow-400 mt-1">
                  <span v-for="star in 5" :key="star" class="i-mdi-star"></span>
                </div>
              </div>
            </div>
            <p class="text-gray-600 italic">"{{ testimonial.comment }}"</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter -->
    <section class="py-16 bg-primary">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-4">Join Our Newsletter</h2>
        <p class="text-primary-100 max-w-xl mx-auto mb-8">
          Subscribe to receive updates, access to exclusive deals, and more.
        </p>
        
        <form class="mt-6 max-w-md mx-auto flex">
          <input 
            type="email" 
            placeholder="Your email address" 
            class="flex-1 min-w-0 py-3 px-4 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white"
            required
          >
          <button 
            type="submit"
            class="bg-gray-900 hover:bg-black text-white py-3 px-6 rounded-r-lg font-medium transition duration-300"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="col-span-2">
            <router-link to="/" class="flex items-center mb-6">
              <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-3">
                <span class="i-mdi-diamond-stone text-xl"></span>
              </div>
              <span class="text-xl font-bold text-white">Elegance</span>
            </router-link>
            <p class="max-w-sm text-gray-400 mb-6">
              Premium fashion for the modern individual. Crafted with passion and attention to detail.
            </p>
            <div class="flex space-x-4">
              <a href="#" class="text-gray-400 hover:text-white transition">
                <span class="i-mdi-facebook text-xl"></span>
              </a>
              <a href="#" class="text-gray-400 hover:text-white transition">
                <span class="i-mdi-instagram text-xl"></span>
              </a>
              <a href="#" class="text-gray-400 hover:text-white transition">
                <span class="i-mdi-twitter text-xl"></span>
              </a>
              <a href="#" class="text-gray-400 hover:text-white transition">
                <span class="i-mdi-pinterest text-xl"></span>
              </a>
            </div>
          </div>
          
          <div>
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Shop</h3>
            <ul class="space-y-3">
              <li><a href="#" class="hover:text-white transition">All Products</a></li>
              <li><a href="#" class="hover:text-white transition">New Arrivals</a></li>
              <li><a href="#" class="hover:text-white transition">Best Sellers</a></li>
              <li><a href="#" class="hover:text-white transition">Sale</a></li>
              <li><a href="#" class="hover:text-white transition">Collections</a></li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Information</h3>
            <ul class="space-y-3">
              <li><a href="#" class="hover:text-white transition">About Us</a></li>
              <li><a href="#" class="hover:text-white transition">Contact</a></li>
              <li><a href="#" class="hover:text-white transition">Shipping Policy</a></li>
              <li><a href="#" class="hover:text-white transition">Returns & Exchanges</a></li>
              <li><a href="#" class="hover:text-white transition">FAQ</a></li>
            </ul>
          </div>
        </div>
        
        <div class="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-400 text-center">
          <p>&copy; ${new Date().getFullYear()} Elegance. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
  import {ref} from 'vue'
const categories = ref([
  { name: 'Women\'s Clothing', link: '/category/womens-clothing' },
  { name: 'Men\'s Apparel', link: '/category/mens-apparel' },
  { name: 'Accessories', link: '/category/accessories' },
  { name: 'Footwear', link: '/category/footwear' }
]);

const products = ref[
  { name: 'Premium Wool Coat', category: 'Outerwear', price: 189.99 },
  { name: 'Silk Evening Dress', category: 'Dresses', price: 149.99 },
  { name: 'Designer Handbag', category: 'Accessories', price: 199.99 },
  { name: 'Leather Boots', category: 'Footwear', price: 159.99 }
]);

const testimonials = ref[
  { 
    name: 'Alex Johnson', 
    comment: 'The quality exceeded my expectations. The attention to detail is remarkable.' 
  },
  { 
    name: 'Sarah Williams', 
    comment: 'I\'ve never received so many compliments on my clothing. Elegance is my new go-to.' 
  },
  { 
    name: 'Michael Chen', 
    comment: 'Their customer service is outstanding. Quick shipping and easy returns.' 
  }
]);
</script>`;
  
  await fs.writeFile(path.join(viewsDir, 'LandingPage.vue'), landingContent);
}