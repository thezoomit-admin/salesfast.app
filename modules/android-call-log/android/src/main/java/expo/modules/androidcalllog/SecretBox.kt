package expo.modules.androidcalllog

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-GCM with a key that never leaves the Android Keystore. Holds the
 * call-capture token in SharedPreferences without storing it in plain text.
 */
internal object SecretBox {
  private const val TAG = "CallLeadPrompt"
  private const val KEYSTORE = "AndroidKeyStore"
  private const val ALIAS = "salesfast_call_capture_v1"
  private const val TRANSFORMATION = "AES/GCM/NoPadding"

  @Synchronized
  private fun key(): SecretKey {
    val store = KeyStore.getInstance(KEYSTORE).apply { load(null) }
    (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
    generator.init(
      KeyGenParameterSpec.Builder(
          ALIAS,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build()
    )
    return generator.generateKey()
  }

  /** Base64 of [iv length][iv][ciphertext], or null if the Keystore fails. */
  fun encrypt(plain: String): String? =
    try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, key())
      val iv = cipher.iv
      val sealed = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
      Base64.encodeToString(byteArrayOf(iv.size.toByte()) + iv + sealed, Base64.NO_WRAP)
    } catch (e: Exception) {
      Log.w(TAG, "Encrypt failed", e)
      null
    }

  fun decrypt(encoded: String): String? =
    try {
      val bytes = Base64.decode(encoded, Base64.NO_WRAP)
      val ivSize = bytes[0].toInt()
      val iv = bytes.copyOfRange(1, 1 + ivSize)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
      String(cipher.doFinal(bytes.copyOfRange(1 + ivSize, bytes.size)), Charsets.UTF_8)
    } catch (e: Exception) {
      // Key lost (e.g. restored backup on a new phone): the app issues a new token.
      Log.w(TAG, "Decrypt failed", e)
      null
    }
}
