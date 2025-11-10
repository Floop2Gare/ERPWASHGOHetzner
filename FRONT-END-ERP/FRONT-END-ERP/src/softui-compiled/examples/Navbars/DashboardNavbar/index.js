/**
=========================================================
* Soft UI Dashboard React - v4.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect } from "react";

// react-router components
import { useLocation, Link } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";

// Soft UI Dashboard React examples
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import { navbar, navbarContainer, navbarRow, navbarIconButton, navbarMobileMenu } from "examples/Navbars/DashboardNavbar/styles";

// Soft UI Dashboard React context
import { useSoftUIController, setTransparentNavbar, setMiniSidenav, setOpenConfigurator } from "context";

// Images
import team2 from "assets/images/team-2.jpg";
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
function DashboardNavbar({
  absolute,
  light,
  isMini
}) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useSoftUIController();
  const {
    miniSidenav,
    transparentNavbar,
    fixedNavbar,
    openConfigurator
  } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const route = useLocation().pathname.split("/").slice(1);
  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, fixedNavbar && window.scrollY === 0 || !fixedNavbar);
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);
  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = event => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  // Render the notifications menu
  const renderMenu = () => /*#__PURE__*/React.createElement(Menu, {
    anchorEl: openMenu,
    anchorReference: null,
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "left"
    },
    open: Boolean(openMenu),
    onClose: handleCloseMenu,
    sx: {
      mt: 2
    }
  }, /*#__PURE__*/React.createElement(NotificationItem, {
    image: /*#__PURE__*/React.createElement("img", {
      src: team2,
      alt: "person"
    }),
    title: ["New message", "from Laur"],
    date: "13 minutes ago",
    onClick: handleCloseMenu
  }), /*#__PURE__*/React.createElement(NotificationItem, {
    image: /*#__PURE__*/React.createElement("img", {
      src: logoSpotify,
      alt: "person"
    }),
    title: ["New album", "by Travis Scott"],
    date: "1 day",
    onClick: handleCloseMenu
  }), /*#__PURE__*/React.createElement(NotificationItem, {
    color: "secondary",
    image: /*#__PURE__*/React.createElement(Icon, {
      fontSize: "small",
      sx: {
        color: ({
          palette: {
            white
          }
        }) => white.main
      }
    }, "payment"),
    title: ["", "Payment successfully completed"],
    date: "2 days",
    onClick: handleCloseMenu
  }));
  return /*#__PURE__*/React.createElement(AppBar, {
    position: absolute ? "absolute" : navbarType,
    color: "inherit",
    sx: theme => navbar(theme, {
      transparentNavbar,
      absolute,
      light
    })
  }, /*#__PURE__*/React.createElement(Toolbar, {
    sx: theme => navbarContainer(theme)
  }, /*#__PURE__*/React.createElement(SoftBox, {
    color: "inherit",
    mb: {
      xs: 1,
      md: 0
    },
    sx: theme => navbarRow(theme, {
      isMini
    })
  }, /*#__PURE__*/React.createElement(Breadcrumbs, {
    icon: "home",
    title: route[route.length - 1],
    route: route,
    light: light
  })), isMini ? null : /*#__PURE__*/React.createElement(SoftBox, {
    sx: theme => navbarRow(theme, {
      isMini
    })
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pr: 1
  }, /*#__PURE__*/React.createElement(SoftInput, {
    placeholder: "Type here...",
    icon: {
      component: "search",
      direction: "left"
    }
  })), /*#__PURE__*/React.createElement(SoftBox, {
    color: light ? "white" : "inherit"
  }, /*#__PURE__*/React.createElement(Link, {
    to: "/authentication/sign-in"
  }, /*#__PURE__*/React.createElement(IconButton, {
    sx: navbarIconButton,
    size: "small"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: ({
      palette: {
        dark,
        white
      }
    }) => ({
      color: light ? white.main : dark.main
    })
  }, "account_circle"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium",
    color: light ? "white" : "dark"
  }, "Sign in"))), /*#__PURE__*/React.createElement(IconButton, {
    size: "small",
    color: "inherit",
    sx: navbarMobileMenu,
    onClick: handleMiniSidenav
  }, /*#__PURE__*/React.createElement(Icon, {
    className: light ? "text-white" : "text-dark"
  }, miniSidenav ? "menu_open" : "menu")), /*#__PURE__*/React.createElement(IconButton, {
    size: "small",
    color: "inherit",
    sx: navbarIconButton,
    onClick: handleConfiguratorOpen
  }, /*#__PURE__*/React.createElement(Icon, null, "settings")), /*#__PURE__*/React.createElement(IconButton, {
    size: "small",
    color: "inherit",
    sx: navbarIconButton,
    "aria-controls": "notification-menu",
    "aria-haspopup": "true",
    variant: "contained",
    onClick: handleOpenMenu
  }, /*#__PURE__*/React.createElement(Icon, {
    className: light ? "text-white" : "text-dark"
  }, "notifications")), renderMenu()))));
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool
};
export default DashboardNavbar;