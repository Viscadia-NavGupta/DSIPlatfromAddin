import React from "react";
import Footer from "../Footer/Footer";
import Sidebar from "../SideBar/Sidebar";
import Header from "../Header/Header";
import {
  LayoutContainer,
  SidebarContainer,
  MainContentContainer,
} from "./MainLayoutStyles";

const MainLayout = ({ children, setPageValue, currentPage, handleLogout }) => {
  return (
    <LayoutContainer>
      {/* Header */}
      <Header />

      {/* Sidebar */}
      <SidebarContainer>
        <Sidebar
          setPageValue={setPageValue}
          currentPage={currentPage} // Pass current page to Sidebar
          handleLogout={handleLogout} // Handle logout functionality
        />
      </SidebarContainer>

      {/* Main Content */}
      <MainContentContainer>{children}</MainContentContainer>

      {/* Footer */}
      <Footer setPageValue={setPageValue} />
    </LayoutContainer>
  );
};

export default MainLayout;
