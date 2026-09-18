/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false, // Oculta o "N" das rotas
    buildActivity: false, // Oculta o indicador de compilação
  },
};

export default nextConfig; // ou module.exports = nextConfig;