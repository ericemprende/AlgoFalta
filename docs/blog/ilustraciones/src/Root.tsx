import { Still } from "remotion";
import { Ilustracion, ilustracionDefaults } from "./Ilustracion";

export const RemotionRoot: React.FC = () => {
  return (
    <Still
      id="Ilustracion"
      component={Ilustracion}
      width={1200}
      height={675}
      defaultProps={ilustracionDefaults}
    />
  );
};
