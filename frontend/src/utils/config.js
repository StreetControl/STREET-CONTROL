import { Settings, Users, Gavel } from "lucide-react";

// Role configuration with display properties
export const roleConfig = (user) => ({
  ORGANIZER: {
    title: "PRE-GARA",
    subtitle: "Configura atleti e parametri",
    icon: Users,
    color: "from-green-500/20 to-green-600/20",
    borderColor: "border-green-500/30",
    iconColor: "text-green-400",
    order: 1,
  },
  DIRECTOR: {
    title: "REGISTA",
    subtitle: "Gestisci il flusso della gara",
    icon: Settings,
    color: "from-blue-500/20 to-blue-600/20",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400",
    order: 2,
  },
  REFEREE: {
    title: "GIUDICE",
    subtitle: user?.judge_position
      ? `Posizione: ${user.judge_position}`
      : "Valuta le alzate",
    icon: Gavel,
    color: "from-purple-500/20 to-purple-600/20",
    borderColor: "border-purple-500/30",
    iconColor: "text-purple-400",
    order: 3,
  },
});
