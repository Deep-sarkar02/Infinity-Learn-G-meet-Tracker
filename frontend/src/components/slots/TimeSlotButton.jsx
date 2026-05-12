import { Button } from "../ui/Button";

export const TimeSlotButton = ({ label, onClick, selected = false }) => (
  <Button
    variant={selected ? "adminSecondary" : "adminGhost"}
    className="w-full justify-center py-2.5"
    onClick={onClick}
  >
    {label}
  </Button>
);
