function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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

import { useEffect } from "react";

// react-router-dom components
import { useLocation, NavLink } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Soft UI Dashboard React examples
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";
import SidenavCard from "examples/Sidenav/SidenavCard";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Soft UI Dashboard React context
import { useSoftUIController, setMiniSidenav } from "context";
function Sidenav({
  color,
  brand,
  brandName,
  routes,
  ...rest
}) {
  const [controller, dispatch] = useSoftUIController();
  const {
    miniSidenav,
    transparentSidenav
  } = controller;
  const location = useLocation();
  const {
    pathname
  } = location;
  const collapseName = pathname.split("/").slice(1)[0];
  const closeSidenav = () => setMiniSidenav(dispatch, true);
  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes.map(({
    type,
    name,
    icon,
    title,
    noCollapse,
    key,
    route,
    href
  }) => {
    let returnValue;
    if (type === "collapse") {
      returnValue = href ? /*#__PURE__*/React.createElement(Link, {
        href: href,
        key: key,
        target: "_blank",
        rel: "noreferrer",
        sx: {
          textDecoration: "none"
        }
      }, /*#__PURE__*/React.createElement(SidenavCollapse, {
        color: color,
        name: name,
        icon: icon,
        active: key === collapseName,
        noCollapse: noCollapse
      })) : /*#__PURE__*/React.createElement(NavLink, {
        to: route,
        key: key
      }, /*#__PURE__*/React.createElement(SidenavCollapse, {
        color: color,
        key: key,
        name: name,
        icon: icon,
        active: key === collapseName,
        noCollapse: noCollapse
      }));
    } else if (type === "title") {
      returnValue = /*#__PURE__*/React.createElement(SoftTypography, {
        key: key,
        display: "block",
        variant: "caption",
        fontWeight: "bold",
        textTransform: "uppercase",
        opacity: 0.6,
        pl: 3,
        mt: 2,
        mb: 1,
        ml: 1
      }, title);
    } else if (type === "divider") {
      returnValue = /*#__PURE__*/React.createElement(Divider, {
        key: key
      });
    }
    return returnValue;
  });
  return /*#__PURE__*/React.createElement(SidenavRoot, _extends({}, rest, {
    variant: "permanent",
    ownerState: {
      transparentSidenav,
      miniSidenav
    }
  }), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 3,
    pb: 1,
    px: 4,
    textAlign: "center"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: {
      xs: "block",
      xl: "none"
    },
    position: "absolute",
    top: 0,
    right: 0,
    p: 1.625,
    onClick: closeSidenav,
    sx: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    color: "secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "close"))), /*#__PURE__*/React.createElement(SoftBox, {
    component: NavLink,
    to: "/",
    display: "flex",
    alignItems: "center"
  }, brand && /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: brand,
    alt: "Soft UI Logo",
    width: "2rem"
  }), /*#__PURE__*/React.createElement(SoftBox, {
    width: !brandName && "100%",
    sx: theme => sidenavLogoLabel(theme, {
      miniSidenav
    })
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "h6",
    variant: "button",
    fontWeight: "medium"
  }, brandName)))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(List, null, renderRoutes), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    my: 2,
    mx: 2,
    mt: "auto"
  }, /*#__PURE__*/React.createElement(SidenavCard, null), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 2
  }, /*#__PURE__*/React.createElement(SoftButton, {
    component: "a",
    href: "https://creative-tim.com/product/soft-ui-dashboard-pro-react",
    target: "_blank",
    rel: "noreferrer",
    variant: "gradient",
    color: color,
    fullWidth: true
  }, "upgrade to pro"))));
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: ""
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired
};
export default Sidenav;