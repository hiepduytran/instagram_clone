import { useState } from 'react';
const useForm = (values) => {
    const [form, setForm] = useState(values);

    const onChangeHandle = (e) => {
        setForm((prevFormValues) => ({
            ...prevFormValues,
            [e.target.name]: e.target.value
        }));
    }
    const resetForm = () => {
        setForm(values);
    };

    return {
        form,
        onChangeHandle,
        resetForm,
    }

}

export default useForm