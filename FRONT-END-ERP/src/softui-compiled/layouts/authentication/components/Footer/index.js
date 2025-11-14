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

// @mui material components
import Grid from "@mui/material/Grid";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import PinterestIcon from "@mui/icons-material/Pinterest";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function Footer() {
  return /*#__PURE__*/React.createElement(SoftBox, {
    component: "footer",
    py: 6
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    justifyContent: "center"
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 10,
    lg: 8
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    mb: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 2,
      lg: 3,
      xl: 6
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "Company")), /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 2,
      lg: 3,
      xl: 6
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "About Us")), /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 0,
      lg: 3,
      xl: 6
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "Team")), /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 2,
      lg: 3,
      xl: 6
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "Product")), /*#__PURE__*/React.createElement(SoftBox, {
    mr: {
      xs: 2,
      lg: 3,
      xl: 6
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "Blog")), /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: "#",
    variant: "body2",
    color: "secondary"
  }, "Pricing")))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 8
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "center",
    mt: 1,
    mb: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 3,
    color: "secondary"
  }, /*#__PURE__*/React.createElement(FacebookIcon, {
    fontSize: "small"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mr: 3,
    color: "secondary"
  }, /*#__PURE__*/React.createElement(TwitterIcon, {
    fontSize: "small"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mr: 3,
    color: "secondary"
  }, /*#__PURE__*/React.createElement(InstagramIcon, {
    fontSize: "small"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mr: 3,
    color: "secondary"
  }, /*#__PURE__*/React.createElement(PinterestIcon, {
    fontSize: "small"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    color: "secondary"
  }, /*#__PURE__*/React.createElement(LinkedInIcon, {
    fontSize: "small"
  })))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 8,
    sx: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: "secondary"
  }, "Copyright \xA9 2021 Soft by Creative Tim."))));
}
export default Footer;