// Seul réglage du site : le dépôt GitHub qui publie les versions (onglet « Releases »).
// Exemple : "josias/vdl"
window.VDL_CONFIG = {
  repo: "josiasapelete/vdl-releases",
  contact: "josiasapelete@gmail.com", // adresse pour les signalements (droits d'auteur, abus)
  // Serveur de licences (paiement Mobile Money via PayDunya) : voir server/ et PUBLIER.md
  licenseApi: "https://vdl-licences.josiasapelete.workers.dev",
  // Liens de paiement Lemon Squeezy (carte, PayPal) : Products > Share > lien de la variante.
  // Vide = bouton « Bientôt disponible ».
  checkout: {
    windows_1y: "",
    windows_life: "",
    premium_1y: "",
    premium_life: "",
    android_1y: "",
    android_life: "",
  },
};
