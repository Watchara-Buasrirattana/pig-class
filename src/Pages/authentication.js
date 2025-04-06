import "./authentication.css"
import Logo from "../Img/Logo.png";
import Image from "next/image";

function authentication() {
    return (
        <div className="auth-container">
            <div className="logo">
                <Image src={Logo} alt="โลโก้" width={200} />
            </div>
        </div>
    )
}

export default authentication;