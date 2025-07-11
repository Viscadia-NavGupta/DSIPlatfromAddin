import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { CgLock } from "react-icons/cg";
import { CgLockUnlock } from "react-icons/cg";

import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
  MessageBox,
} from "./powerbistyles";

const PowerbiManegment = ({ setPageValue }) => {
  // ─── Responsive sizing logic ─────────────────────────────────────────────
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 32,
  });

  useEffect(() => {
    const updateSize = () => {
      const aw = window.innerWidth - 130;
      const ah = window.innerHeight - 180;
      const cols = Math.max(2, Math.floor(aw / 110));
      const rows = Math.max(2, Math.floor(ah / 110));
      const sz = Math.min(aw / cols, ah / rows, 90);
      setButtonSize({
        width: sz,
        height: sz * 0.8,
        fontSize: `${Math.max(0.7, sz / 10)}rem`,
        iconSize: sz * 0.4,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          {/* on click, go back to the Home page */}
          <BackButtonIcon
            as={FaArrowLeft}
            size={24}
            onClick={() => setPageValue("Home")}
          />
          <h1>Power BI Dashboards</h1>
        </WelcomeContainer>

        <ButtonsContainer>
          {/* PowerBI Locked */}
          <Button
            onClick={() =>
              window.open(
                "https://app.powerbi.com/groups/me/reports/b46b9827-0286-4133-89a5-d39e2eebc85f/f1810362774bd852b3c8?ctid=c05372cf-28bd-4caf-83dd-e8b65c066ce9&experience=power-bi",
                "_blank"
              )
            }
            style={{
              width: buttonSize.width,
              height: buttonSize.height,
            }}
          >
            <IconWrapper size={buttonSize.iconSize}>
              <CgLock size={buttonSize.iconSize} />
            </IconWrapper>
            <p className="button-text">Locked</p>
          </Button>

          {/* PowerBI Interim */}
          <Button
            onClick={() => window.open("https://app.powerbi.com/groups/me/reports/b46b9827-0286-4133-89a5-d39e2eebc85f/f1810362774bd852b3c8?ctid=c05372cf-28bd-4caf-83dd-e8b65c066ce9&experience=power-bi", "_blank")}
            style={{
              width: buttonSize.width,
              height: buttonSize.height,
            }}
          >
            <IconWrapper size={buttonSize.iconSize}>
              <CgLockUnlock size={buttonSize.iconSize} />
            </IconWrapper>
            <p className="button-text">Interim</p>
          </Button>
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default PowerbiManegment;
