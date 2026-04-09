'use client';

import { useMemo } from 'react';
import { useCheckoutStore } from '../store/checkoutStore';

/**
 * Hook principal para acceder al checkout
 * Proporciona todas las acciones y estado del checkout
 */
export const useCheckout = () => {
    const isOpen = useCheckoutStore((state) => state.isOpen);
    const step = useCheckoutStore((state) => state.step);
    const service = useCheckoutStore((state) => state.service);
    const userData = useCheckoutStore((state) => state.userData);
    const paymentData = useCheckoutStore((state) => state.paymentData);
    const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
    const orderId = useCheckoutStore((state) => state.orderId);
    const total = useCheckoutStore((state) => state.total);
    const isLoading = useCheckoutStore((state) => state.isLoading);
    const error = useCheckoutStore((state) => state.error);
    const isExistingUser = useCheckoutStore((state) => state.isExistingUser);
    const tempPassword = useCheckoutStore((state) => state.tempPassword);
    const completedAt = useCheckoutStore((state) => state.completedAt);
    const isProcessingPayment = useCheckoutStore((state) => state.isProcessingPayment);
    const isWaitingForWebhook = useCheckoutStore((state) => state.isWaitingForWebhook);

    const openCheckout = useCheckoutStore((state) => state.openCheckout);
    const closeCheckout = useCheckoutStore((state) => state.closeCheckout);
    const setStep = useCheckoutStore((state) => state.setStep);
    const setUserData = useCheckoutStore((state) => state.setUserData);
    const setPaymentData = useCheckoutStore((state) => state.setPaymentData);
    const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
    const setIsProcessingPayment = useCheckoutStore((state) => state.setIsProcessingPayment);
    const setIsWaitingForWebhook = useCheckoutStore((state) => state.setIsWaitingForWebhook);
    const setOrderId = useCheckoutStore((state) => state.setOrderId);
    const checkUserExists = useCheckoutStore((state) => state.checkUserExists);
    const sendOtp = useCheckoutStore((state) => state.sendOtp);
    const verifyOtp = useCheckoutStore((state) => state.verifyOtp);
    const authenticateUser = useCheckoutStore((state) => state.authenticateUser);
    const submitOrder = useCheckoutStore((state) => state.submitOrder);
    const markAsCompleted = useCheckoutStore((state) => state.markAsCompleted);
    const reset = useCheckoutStore((state) => state.reset);

    return useMemo(() => ({
        isOpen,
        step,
        service,
        userData,
        paymentData,
        paymentMethod,
        orderId,
        total,
        isLoading,
        error,
        isExistingUser,
        tempPassword,
        completedAt,
        isProcessingPayment,
        isWaitingForWebhook,

        openCheckout,
        closeCheckout,
        setStep,
        setUserData,
        setPaymentData,
        setPaymentMethod,
        setIsProcessingPayment,
        setIsWaitingForWebhook,
        setOrderId,
        checkUserExists,
        sendOtp,
        verifyOtp,
        authenticateUser,
        submitOrder,
        markAsCompleted,
        reset,
    }), [
        isOpen, step, service, userData, paymentData, paymentMethod, orderId, total, 
        isLoading, error, isExistingUser, tempPassword, completedAt, 
        isProcessingPayment, isWaitingForWebhook, openCheckout, closeCheckout, 
        setStep, setUserData, setPaymentData, setPaymentMethod, 
        setIsProcessingPayment, setIsWaitingForWebhook, setOrderId, 
        checkUserExists, sendOtp, verifyOtp, authenticateUser, submitOrder, 
        markAsCompleted, reset
    ]);
};
