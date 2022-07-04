import React from "react"
import styles from "../styles/Home.module.css"

export default function MsgPopup({ popupState, onClose }) {
  return (
    <div className={styles.popupbox}>
      <div className={styles.box}>
        <div className={styles.popuptext}>{popupState.msg}</div>
        {popupState.showClose && 
          <div className={styles.popupcenter}>
            <div className={styles.button} onClick={onClose}>Close</div>
          </div>
        }
      </div>
    </div>
  )
}