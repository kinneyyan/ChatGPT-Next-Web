import { getServerSideConfig } from "@/app/config/server";
import md5 from "blueimp-md5";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../../constant";
import BotIcon from "../../icons/bot.svg";
import LoadingIcon from "../../icons/three-dots.svg";
import { useAccessStore } from "../../store";
import { IconButton } from "../button";
import { showToast } from "../ui-lib";
import styles from "./index.module.scss";

interface IAccountInfo {
  account: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { updateLoginToken } = useAccessStore.getState();
  const [accountInfo, setAccountInfo] = useState<IAccountInfo>({
    account: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const btnDisabled = !accountInfo?.account || !accountInfo?.password;

  const goHome = () => navigate(Path.Home);

  const handleOnLogin = async () => {
    const { loginBaseUrl } = getServerSideConfig();
    setLoading(true);
    const res = await fetch(`${loginBaseUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...accountInfo,
        password: md5(accountInfo.password),
      }),
    })
      .then((res) => res.json())
      .catch(() => null);
    // NOTE: 目前在阿里云K8S中容器中会报 Error [TypeError]: fetch failed。故用client端调用
    // const res = await fetch("/api/login", {
    //   method: "POST",
    //   body: JSON.stringify({
    //     ...accountInfo,
    //     password: md5(accountInfo.password),
    //   }),
    // })
    //   .then((res) => res.json())
    //   .catch(() => null);
    setLoading(false);
    if (res?.code === 200 && res?.data) {
      updateLoginToken(res.data.tokenValue);
      goHome();
    } else {
      showToast(res?.message || "登录失败");
    }
  };

  const handleOnKeyDown = (e: any) => {
    if (btnDisabled) {
      return;
    }
    if (e.key === "Enter") {
      handleOnLogin();
    }
  };

  return (
    <div className={styles["login-page"]}>
      <div className={`no-dark ${styles["auth-logo"]}`}>
        <BotIcon />
      </div>

      <div className={styles["auth-title"]}>请登录</div>
      <div className={styles["auth-tips"]}>
        管理员开启了密码验证，请在下方填入账号密码
      </div>

      <input
        className={styles["auth-input"]}
        type="text"
        placeholder="请输入账号"
        onKeyDown={handleOnKeyDown}
        onChange={(e) => {
          setAccountInfo((pre) => ({ ...pre, account: e.target.value }));
        }}
      />
      <input
        className={styles["auth-input"]}
        type="password"
        placeholder="请输入密码"
        onKeyDown={handleOnKeyDown}
        onChange={(e) => {
          setAccountInfo((pre) => ({ ...pre, password: e.target.value }));
        }}
      />

      <div className={styles["auth-actions"]}>
        <IconButton
          text="登录"
          type="primary"
          disabled={btnDisabled}
          onClick={handleOnLogin}
        />
      </div>

      {loading && (
        <div
          style={{
            position: "fixed",
            height: "100vh",
            width: "100vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <LoadingIcon />
        </div>
      )}
    </div>
  );
}
