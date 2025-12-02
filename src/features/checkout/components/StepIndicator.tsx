import React from 'react';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
    currentStep: 1 | 2 | 3;
    totalSteps?: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
    currentStep,
    totalSteps = 2
}) => {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    return (
        <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
                {steps.map((step) => (
                    <div key={step} className="flex items-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{
                                scale: currentStep === step ? 1.1 : 1,
                            }}
                            className={`
                w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                transition-colors duration-300
                ${currentStep === step
                                    ? 'bg-azul-primario text-white shadow-lg'
                                    : currentStep > step
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                }
              `}
                        >
                            {currentStep > step ? '✓' : step}
                        </motion.div>
                        {step < totalSteps && (
                            <div
                                className={`
                  w-12 h-1 mx-1
                  ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}
                `}
                            />
                        )}
                    </div>
                ))}
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
                Paso {currentStep} de {totalSteps}
            </p>
        </div>
    );
};
