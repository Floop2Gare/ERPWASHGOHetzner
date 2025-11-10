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
import Tooltip from "@mui/material/Tooltip";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftAvatar from "components/SoftAvatar";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Soft UI Dashboard React base styles
import typography from "assets/theme/base/typography";

// VR dashboards components
import BaseLayout from "layouts/virtual-reality/components/BaseLayout";

// VRInfo dashboards components
import TodoList from "layouts/virtual-reality/components/TodoList";
import TodoCard from "layouts/virtual-reality/components/TodoCard";
import Emails from "layouts/virtual-reality/components/Emails";
import MediaPlayer from "layouts/virtual-reality/components/MediaPlayer";
import Messages from "layouts/virtual-reality/components/Messages";

// Images
import team1 from "assets/images/team-1.jpg";
import sunCloud from "assets/images/small-logos/icon-sun-cloud.png";
function VRInfo() {
  const {
    d1,
    h2,
    fontWeightMedium
  } = typography;
  return /*#__PURE__*/React.createElement(BaseLayout, null, /*#__PURE__*/React.createElement(SoftBox, {
    minHeight: "100vh",
    ml: {
      xs: 0,
      md: 10
    },
    mt: {
      xs: 0,
      md: 4
    },
    pt: {
      xs: 16,
      md: 32
    },
    pb: {
      xs: 0,
      md: 3
    },
    sx: {
      transform: "scale(1.1)"
    }
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: {
      xs: "row",
      md: "column"
    },
    justifyContent: "center",
    alignItems: "center",
    px: 2,
    mb: {
      xs: 8,
      md: 0
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "My Profile",
    placement: "right"
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    src: team1,
    alt: "Profile Picture",
    size: "lg",
    variant: "rounded",
    sx: {
      cursor: "pointer"
    }
  })), /*#__PURE__*/React.createElement(SoftBox, {
    my: {
      xs: 0,
      md: 2
    },
    mx: {
      xs: 2,
      md: 0
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Home",
    placement: "right"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    size: "large",
    iconOnly: true,
    sx: ({
      palette: {
        dark
      },
      borders: {
        borderRadius
      }
    }) => ({
      color: dark.main,
      borderRadius: borderRadius.lg
    })
  }, /*#__PURE__*/React.createElement(Icon, null, "home")))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: {
      xs: 0,
      md: 2
    },
    mr: {
      xs: 2,
      md: 0
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Search",
    placement: "right"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    size: "large",
    iconOnly: true,
    sx: ({
      palette: {
        dark
      },
      borders: {
        borderRadius
      }
    }) => ({
      color: dark.main,
      borderRadius: borderRadius.lg
    })
  }, /*#__PURE__*/React.createElement(Icon, null, "search")))), /*#__PURE__*/React.createElement(Tooltip, {
    title: "Minimize",
    placement: "right"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    size: "large",
    iconOnly: true,
    sx: ({
      palette: {
        dark
      },
      borders: {
        borderRadius
      }
    }) => ({
      color: dark.main,
      borderRadius: borderRadius.lg
    })
  }, /*#__PURE__*/React.createElement(Icon, null, "more_horiz"))))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 11,
    lg: 10,
    xl: 9
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: {
      xs: "center",
      md: "flex-start"
    },
    ml: {
      xs: 1,
      md: 4
    },
    mt: -1
  }, /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftBox, {
    fontSize: {
      xs: h2.fontSize,
      lg: d1.fontSize
    },
    fontWeight: fontWeightMedium,
    lineHeight: 1
  }, "28\xB0C"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "uppercase"
  }, "cloudy")), /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: sunCloud,
    width: "30%"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 3,
    mb: 8,
    ml: {
      xs: 1,
      md: 4
    },
    mr: {
      xs: 1,
      md: 0
    }
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 4
  }, /*#__PURE__*/React.createElement(TodoList, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 4
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(TodoCard, null)), /*#__PURE__*/React.createElement(Emails, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 4
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(MediaPlayer, null)), /*#__PURE__*/React.createElement(Messages, null))))))));
}
export default VRInfo;