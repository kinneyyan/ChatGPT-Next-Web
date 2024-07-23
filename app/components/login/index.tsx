import { useState } from "react";
import { useNavigate } from "react-router-dom";
import md5 from "spark-md5";
import { Path } from "../../constant";
import BotIcon from "../../icons/bot.svg";
import LoadingIcon from "../../icons/three-dots.svg";
import { useAccessStore } from "../../store";
import { IconButton } from "../button";
import { showToast } from "../ui-lib";
import styles from "./index.module.scss";

interface IAccountInfo {
  username: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { updateLoginToken } = useAccessStore.getState();
  const [accountInfo, setAccountInfo] = useState<IAccountInfo>({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const btnDisabled = !accountInfo?.username || !accountInfo?.password;

  const goHome = () => navigate(Path.Home);

  const handleOnLogin = async () => {
    setLoading(true);
    const res = await fetch(
      "https://api-gateway-dev.ab-inbev.cn/budtech-fe-tool-server/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...accountInfo,
          password: md5.hash(accountInfo.password),
        }),
      },
    )
      .then((res) => res.json())
      .catch(() => null);
    setLoading(false);
    if (res?.code === 200 && res?.data) {
      updateLoginToken(res.data.accessToken);
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
          setAccountInfo((pre) => ({ ...pre, username: e.target.value }));
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
