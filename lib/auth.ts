import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { 
    EmailAuthProvider, 
    createUserWithEmailAndPassword, 
    reauthenticateWithCredential, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    updatePassword} from 'firebase/auth'; 
import { auth } from './firebaseConfig'; 

// Đăng ký tài khoản mới 
export async function signUp(email: string, password: string) { 
    try { 
        const userCredential = await createUserWithEmailAndPassword(auth, email, password); 
        return { user: userCredential.user }; 
    } catch (error: any) { 
        throw formatFirebaseError(error); 
    } } 
// Đăng nhập email 
export async function signIn(email: string, password: string) { 
    try { 
        const userCredential = await signInWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user; 
        return user; 
    } catch (error: any) { 
        console.log('Firebase error code:', error.code); 
        console.log('Firebase error message:', error.message); 
        throw formatFirebaseError(error); 
    } 
} 
// Gửi email đặt lại mật khẩu 
export async function sendPass(email: string) { 
    try { 
        await sendPasswordResetEmail(auth, email); 
        return { success: true }; 
    } catch (error: any) { 
        throw formatFirebaseError(error); 
    } 
} 
// Đổi pass 
export async function changePassword(oldPassword: string, newPassword: string) { 
    const user = auth.currentUser; 
    if (!user || !user.email) { 
        const error: any = new Error('Vui lòng đăng nhập lại để đổi mật khẩu'); 
        error.code = 'custom/requires-relogin'; 
        throw error; 
    } 
    // Tạo credential từ email và mật khẩu cũ 
    const credential = EmailAuthProvider.credential(user.email, oldPassword); 
    try { 
        // Xác thực lại người dùng 
        await reauthenticateWithCredential(user, credential); 
        // Đổi mật khẩu nếu xác thực thành công 
        await updatePassword(user, newPassword); 
        await user.reload(); 
        return 'Đổi mật khẩu thành công'; 
    } catch (error: any) { 
        if (error.code === 'auth/invalid-credential') { 
            throw new Error('Mật khẩu cũ không đúng.'); 
        } else if (error.code === 'auth/requires-recent-login') { 
            throw new Error('Vui lòng đăng nhập lại để đổi mật khẩu'); 
        } else { 
            throw new Error('Đổi mật khẩu thất bại: ' + error.message); 
        } 
    } 
} 
// Hàm format lỗi Firebase cho dễ hiểu 
function formatFirebaseError(error: any): Error { 
    let message = 'Có lỗi xảy ra'; 
    switch (error.code) { 
        case 'auth/invalid-credential' : 
        message = 'Thông tin đăng nhập không hợp lệ. Vui lòng nhập lại email và mật khẩu.'; 
        break; 
        case 'auth/email-already-in-use': 
        message = 'Email đã được sử dụng'; 
        break;
        case 'auth/invalid-email': 
        message = 'Email không hợp lệ'; 
        break; 
        case 'auth/weak-password': 
        message = 'Mật khẩu quá yếu (ít nhất 6 ký tự)'; 
        break; 
        case 'auth/user-not-found': 
        message = 'Không tìm thấy tài khoản'; 
        break; 
        case 'auth/wrong-password': 
        message = 'Sai mật khẩu'; 
        break; 
        case 'auth/too-many-requests':
        message = 'Tài khoản bị tạm khóa vì đăng nhập sai quá nhiều'; 
        break; 
    } 
    return new Error(message); 
}