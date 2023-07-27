import { Outlet } from "react-router-dom";
import Footer from "./main/Footer";
import Navbar from "./main/Navbar";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
};

export default MainLayout;
