"use client";

import { motion } from "framer-motion";
import  WorldMap  from "./ui/world-map";

export function WorldMapSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#ffedea]">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-linear-to-r text-[#3d3436] bg-clip-text">
              Truly Decentralized
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your data is distributed across a global network of nodes, ensuring
            maximum availability, security, and censorship resistance
          </p>
        </motion.div>

        {/* World Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="w-full bg-[#ffedea]"
        >
          <WorldMap
            dots={[
              {
                start: { lat: 37.7749, lng: -122.4194 }, // San Francisco
                end: { lat: 51.5074, lng: -0.1278 }, // London
              },
              {
                start: { lat: 35.6762, lng: 139.6503 }, // Tokyo
                end: { lat: 1.3521, lng: 103.8198 }, // Singapore
              },
              {
                start: { lat: 40.7128, lng: -74.006 }, // New York
                end: { lat: 52.52, lng: 13.405 }, // Berlin
              },
              {
                start: { lat: -33.8688, lng: 151.2093 }, // Sydney
                end: { lat: 22.3193, lng: 114.1694 }, // Hong Kong
              },
              {
                start: { lat: 19.076, lng: 72.8777 }, // Mumbai
                end: { lat: 55.7558, lng: 37.6173 }, // Moscow
              },
              {
                start: { lat: -23.5505, lng: -46.6333 }, // São Paulo
                end: { lat: 50.1109, lng: 8.6821 }, // Frankfurt
              },
              {
                start: { lat: 25.2048, lng: 55.2708 }, // Dubai
                end: { lat: 1.3521, lng: 103.8198 }, // Singapore
              },
              {
                start: { lat: -33.9249, lng: 18.4241 }, // Cape Town
                end: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
              },
              {
                start: { lat: 43.6532, lng: -79.3832 }, // Toronto
                end: { lat: 35.6762, lng: 139.6503 }, // Tokyo
              },
              {
                start: { lat: 48.8566, lng: 2.3522 }, // Paris
                end: { lat: 19.076, lng: 72.8777 }, // Mumbai
              },
              {
                start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
                end: { lat: -33.8688, lng: 151.2093 }, // Sydney
              },
              {
                start: { lat: 37.5665, lng: 126.978 }, // Seoul
                end: { lat: 37.7749, lng: -122.4194 }, // San Francisco
              },
              {
                start: { lat: 51.5074, lng: -0.1278 }, // London
                end: { lat: 25.2048, lng: 55.2708 }, // Dubai
              },
              {
                start: { lat: 19.4326, lng: -99.1332 }, // Mexico City
                end: { lat: 40.4168, lng: -3.7038 }, // Madrid
              },
              {
                start: { lat: -26.2041, lng: 28.0473 }, // Johannesburg
                end: { lat: -33.8688, lng: 151.2093 }, // Sydney
              },
              {
                start: { lat: 59.3293, lng: 18.0686 }, // Stockholm
                end: { lat: 1.3521, lng: 103.8198 }, // Singapore
              },
              {
                start: { lat: 41.8781, lng: -87.6298 }, // Chicago
                end: { lat: 51.5074, lng: -0.1278 }, // London
              },
              {
                start: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
                end: { lat: 22.3193, lng: 114.1694 }, // Hong Kong
              },
              {
                start: { lat: 32.0853, lng: 34.7818 }, // Tel Aviv
                end: { lat: 40.7128, lng: -74.006 }, // New York
              },
              {
                start: { lat: 13.7563, lng: 100.5018 }, // Bangkok
                end: { lat: 52.52, lng: 13.405 }, // Berlin
              },
              {
                start: { lat: 12.9716, lng: 77.5946 }, // Bangalore
                end: { lat: 37.7749, lng: -122.4194 }, // San Francisco
              },
              {
                start: { lat: 12.9716, lng: 77.5946 }, // Bangalore
                end: { lat: 51.5074, lng: -0.1278 }, // London
              },
              {
                start: { lat: 12.9716, lng: 77.5946 }, // Bangalore
                end: { lat: 1.3521, lng: 103.8198 }, // Singapore
              },
              {
                start: { lat: 28.7041, lng: 77.1025 }, // Delhi
                end: { lat: 25.2048, lng: 55.2708 }, // Dubai
              },
              {
                start: { lat: 28.7041, lng: 77.1025 }, // Delhi
                end: { lat: 35.6762, lng: 139.6503 }, // Tokyo
              },
              {
                start: { lat: 28.7041, lng: 77.1025 }, // Delhi
                end: { lat: -33.8688, lng: 151.2093 }, // Sydney
              },
              {
                start: { lat: 19.076, lng: 72.8777 }, // Mumbai
                end: { lat: 40.7128, lng: -74.006 }, // New York
              },
              {
                start: { lat: 19.076, lng: 72.8777 }, // Mumbai
                end: { lat: 52.52, lng: 13.405 }, // Berlin
              },
              {
                start: { lat: 19.076, lng: 72.8777 }, // Mumbai
                end: { lat: 22.3193, lng: 114.1694 }, // Hong Kong
              },
            ]}
          />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16"
        >
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436] mb-2">
              150+
            </div>
            <div className="text-sm text-[#b35340]">Storage Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436] mb-2">
              45
            </div>
            <div className="text-sm text-[#b35340]">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436] mb-2">
              99.99%
            </div>
            <div className="text-sm text-[#b35340]">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold  bg-clip-text text-[#3d3436] mb-2">
              &lt;50ms
            </div>
            <div className="text-sm text-[#b35340]">Avg Latency</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
