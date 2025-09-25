import { useCallback, useEffect, useRef, useState } from "react";
import { useRunOnJS, useWorklet } from "react-native-worklets-core";

type UseWorkletTaskOptions<T> = {
    onComplete?: (result: T) => void;   // 子线程完成回调
    onError?: (error: any) => void;     // 错误回调
};

export function useWorkletTask<T>(
    workletFn: () => T,
    options: UseWorkletTaskOptions<T> = {}
) {
    const { onComplete, onError } = options;

    const [isComputing, setIsComputing] = useState(false);
    const isMountedRef = useRef(true);

    // 页面卸载时标记
    useEffect(() => {
        return () => {
            console.log('---scj---使用hook的页面已卸载!')
            isMountedRef.current = false;
        };
    }, []);

    // 主线程回调
    const workletDone = useRunOnJS((res: T) => {
        console.log('---scj---回到主线程执行!')
        if (!isMountedRef.current) {
            console.log("页面已卸载，丢弃结果");
            return;
        }
        setIsComputing(false);
        onComplete?.(res);
    }, []);

    // 包装成 Worklet
    const workletTask = useWorklet(
        "default",
        (callback: (res: T) => void, errorCb: (err: any) => void) => {
            "worklet";
            try {
                console.log('---scj---子线程开始任务!')
                const result = workletFn();
                console.log('---scj---子线程任务结束!')
                callback(result);
            } catch (e) {
                errorCb(e);
            }
        });

    // 执行任务
    const runTask = useCallback(() => {
        // 防止重复执行
        if (isComputing) {
           return console.log('---scj---已存在正在进行的子线程!')
        };
        setIsComputing(true);

        workletTask(
            workletDone,
            (err: any) => {
                console.log('---scj---子线程处理失败!')
                if (!isMountedRef.current) return;
                setIsComputing(false);
                onError?.(err);
            }
        );
    }, [isComputing, onComplete, onError, workletTask]);

    return { runTask, isComputing };
}