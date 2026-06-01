import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MaterialItem } from "@/lib/admin-api";
import {
  baseOrcamento,
  calcDescontoOrcamento,
  formatDescontoPctOrc,
  formatDescontoValorOrc,
  inventarioSubtotalOrcamento,
  parseMoneyBr,
  sanitizarNumeroBr,
  type OrcamentoLinha,
  type OrcamentoModoDesconto,
} from "@/lib/orcamento.server";

type CampoDesconto = "percent" | "valor" | "total";

export function useOrcamentoForm(materiais: MaterialItem[]) {
  const [partData, setPartData] = useState<OrcamentoLinha[]>([]);
  const [descontoPct, setDescontoPct] = useState("");
  const [descontoValor, setDescontoValor] = useState("");
  const [valorMostrar, setValorMostrar] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [metros, setMetros] = useState("1");

  const descontoSourceRef = useRef<OrcamentoModoDesconto>("percent");
  const valorBaseManualRef = useRef(0);
  const syncingRef = useRef(false);
  const carregandoRef = useRef(false);
  const campoFocadoRef = useRef<CampoDesconto | null>(null);

  const subtotal = useMemo(() => inventarioSubtotalOrcamento(partData), [partData]);

  const getDesc = useCallback(() => {
    return calcDescontoOrcamento(
      subtotal,
      valorBaseManualRef.current,
      descontoSourceRef.current,
      descontoPct,
      descontoValor,
      valorMostrar,
    );
  }, [subtotal, descontoPct, descontoValor, valorMostrar]);

  const sincronizarDescontoPar = useCallback(() => {
    const base = baseOrcamento(subtotal, valorBaseManualRef.current, valorMostrar);
    if (base <= 0 && descontoSourceRef.current !== "total") return;

    const desc = getDesc();
    const src = descontoSourceRef.current;
    const foco = campoFocadoRef.current;
    syncingRef.current = true;

    if (src !== "total") {
      if (src !== "valor" && foco !== "valor") {
        setDescontoValor(formatDescontoValorOrc(desc.descontoValor));
      }
      if (src !== "percent" && foco !== "percent") {
        setDescontoPct(formatDescontoPctOrc(desc.descontoPct));
      }
      if (foco !== "total") {
        setValorMostrar(formatDescontoValorOrc(desc.total));
      }
    }

    syncingRef.current = false;
  }, [subtotal, valorMostrar, getDesc]);

  useEffect(() => {
    if (carregandoRef.current) return;
    if (partData.length === 0) return;
    valorBaseManualRef.current = 0;
    sincronizarDescontoPar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partData]);

  const onValorTotalInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      const v = sanitizarNumeroBr(raw);
      setValorMostrar(v);
      descontoSourceRef.current = "total";
      valorBaseManualRef.current = parseMoneyBr(v);
      setDescontoPct("");
      setDescontoValor("");
    },
    [],
  );

  const onValorTotalBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    const n = parseMoneyBr(valorMostrar);
    setValorMostrar(n > 0 ? formatDescontoValorOrc(n) : "");
    descontoSourceRef.current = "total";
    valorBaseManualRef.current = n;
    sincronizarDescontoPar();
  }, [valorMostrar, sincronizarDescontoPar]);

  const onValorTotalFocus = useCallback(() => {
    campoFocadoRef.current = "total";
  }, []);

  const onDescontoPctInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      setDescontoPct(sanitizarNumeroBr(raw));
      descontoSourceRef.current = "percent";
      sincronizarDescontoPar();
    },
    [sincronizarDescontoPar],
  );

  const onDescontoPctBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    const desc = getDesc();
    setDescontoPct(desc.descontoPct > 0 ? formatDescontoPctOrc(desc.descontoPct) : "");
    descontoSourceRef.current = "percent";
    sincronizarDescontoPar();
  }, [getDesc, sincronizarDescontoPar]);

  const onDescontoPctFocus = useCallback(() => {
    campoFocadoRef.current = "percent";
  }, []);

  const onDescontoValorInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      setDescontoValor(sanitizarNumeroBr(raw));
      descontoSourceRef.current = "valor";
      sincronizarDescontoPar();
    },
    [sincronizarDescontoPar],
  );

  const onDescontoValorBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    const desc = getDesc();
    setDescontoValor(desc.descontoValor > 0 ? formatDescontoValorOrc(desc.descontoValor) : "");
    descontoSourceRef.current = "valor";
    sincronizarDescontoPar();
  }, [getDesc, sincronizarDescontoPar]);

  const onDescontoValorFocus = useCallback(() => {
    campoFocadoRef.current = "valor";
  }, []);

  const materiaisFiltrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    if (!q) return materiais;
    return materiais.filter((m) => m.material.toLowerCase().includes(q));
  }, [materiais, pesquisa]);

  const addMaterial = useCallback(() => {
    const m = materiais.find((x) => String(x.id) === materialId);
    if (!m) return;
    const mt = Number.parseFloat(metros.replace(",", ".")) || 1;
    setPartData((prev) => [
      ...prev,
      {
        material: m.material,
        metros: mt,
        valor: m.valor,
        valor_custo: m.valor_custo,
        id: m.id,
      },
    ]);
    setMaterialId("");
    setMetros("1");
  }, [materiais, materialId, metros]);

  const removeLinha = useCallback((idx: number) => {
    setPartData((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const resetForm = useCallback(() => {
    setPartData([]);
    setDescontoPct("");
    setDescontoValor("");
    setValorMostrar("");
    setFormaPagamento("");
    setCpfCnpj("");
    setObservacao("");
    setPesquisa("");
    setMaterialId("");
    setMetros("1");
    descontoSourceRef.current = "percent";
    valorBaseManualRef.current = 0;
    carregandoRef.current = false;
    campoFocadoRef.current = null;
  }, []);

  const loadExisting = useCallback(
    (data: {
      partData: OrcamentoLinha[];
      valor: number;
      descontoPercent: number;
      observacao: string;
      cpfCnpj: string;
    }) => {
      carregandoRef.current = true;
      setPartData(data.partData);
      setCpfCnpj(data.cpfCnpj.replace(/\D/g, "") === "00000000000" ? "" : data.cpfCnpj);
      setObservacao(data.observacao);
      setDescontoPct(
        data.descontoPercent > 0
          ? formatDescontoPctOrc(data.descontoPercent)
          : "",
      );
      setDescontoValor("");
      setValorMostrar(formatDescontoValorOrc(data.valor));
      setFormaPagamento("");
      descontoSourceRef.current = "percent";
      valorBaseManualRef.current = 0;
      queueMicrotask(() => {
        carregandoRef.current = false;
      });
    },
    [],
  );

  const buildPayload = useCallback(() => {
    const desc = getDesc();
    return {
      partData,
      formaPagamento,
      descontoModo: "total" as const,
      descontoPercent: desc.descontoPct,
      descontoValor: desc.descontoValor,
      valor: desc.total,
      cpfCnpj,
      observacao,
    };
  }, [partData, formaPagamento, getDesc, cpfCnpj, observacao]);

  const onMetrosInput = useCallback((raw: string) => {
    let v = raw.replace(/[^\d,.]/g, "");
    const sep = v.includes(",") ? "," : v.includes(".") ? "." : null;
    if (sep) {
      const parts = v.split(sep);
      v = parts[0] + sep + (parts[1] ?? "").slice(0, 2);
    }
    setMetros(v);
  }, []);

  return {
    partData,
    descontoPct,
    descontoValor,
    valorMostrar,
    formaPagamento,
    setFormaPagamento,
    cpfCnpj,
    setCpfCnpj,
    observacao,
    setObservacao,
    pesquisa,
    setPesquisa,
    materialId,
    setMaterialId,
    metros,
    onMetrosInput,
    materiaisFiltrados,
    addMaterial,
    removeLinha,
    resetForm,
    loadExisting,
    buildPayload,
    onValorTotalInput,
    onValorTotalBlur,
    onValorTotalFocus,
    onDescontoPctInput,
    onDescontoPctBlur,
    onDescontoPctFocus,
    onDescontoValorInput,
    onDescontoValorBlur,
    onDescontoValorFocus,
    subtotal,
  };
}
