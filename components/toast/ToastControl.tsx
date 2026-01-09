import ToastManager from 'toastify-react-native';
import { ModalToast, SquareToast, ToastType } from "./CustomToast";

const ToastControl = () => {
  const toastConfig = {
    success: (props: any) => <ModalToast {...props} type={ToastType.success} />,
    error: (props: any) => <ModalToast {...props} type={ToastType.error} />,
    info: (props: any) => <ModalToast {...props} type={ToastType.info} />,
    middleSuccess: (props: any) => <SquareToast {...props} type={ToastType.middleSuccess} />,
    middleError: (props: any) => <SquareToast {...props} type={ToastType.middleError} />,
  };

  return (
    <ToastManager
      config={toastConfig}
      position={'center'}
      showProgressBar={false}
      showCloseIcon={false}
      useModal={false}
    />
  )
}

export default ToastControl;